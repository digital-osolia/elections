import {
	BadRequestException,
	Body,
	Controller,
	Get,
	NotFoundException,
	Param,
	Post,
	Put,
	Query,
	UseGuards,
} from '@nestjs/common';
import { ElectionsService } from './elections.service';
import { ApiTags } from '@nestjs/swagger';
import { instanceToPlain } from 'class-transformer';
import {
	BallotEntity,
	CandidateEntity,
	ElectionEntity,
} from './elections.entity';
import {
	CastBallotBody,
	CreateElectionBody,
	SubmitCandidacyBody,
} from './elections.dto';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { User } from '@/auth/schemas/user.schema';
import { IsAdmin } from '@/middleware/guards/isAdmin.guard';
import { LoggedIn } from '@/middleware/guards/loggedIn.guard';
import * as irv from '@/utils/irv2';
import { AuthService } from '@/auth/auth.service';

@ApiTags('elections')
@Controller('/elections')
export class ElectionsController {
	constructor(
		private electionsService: ElectionsService,
		private authService: AuthService,
	) {}

	@Get('/current')
	async getCurrent(@Query('allowPrevious') allowPrevious: boolean) {
		const election = await this.electionsService.getLatest();

		const latest = election?.[0];

		const previous = latest.end.valueOf() < Date.now() && !allowPrevious;
		const soon = latest.open.valueOf() > Date.now();

		if (!election || !latest || previous || soon) {
			throw new NotFoundException();
		}

		if (allowPrevious) {
			const delta = Date.now() - latest.end.valueOf();

			const oneDay = 24 * 60 * 60 * 1000;

			if (delta > oneDay) {
				throw new NotFoundException(
					'The latest election ended more than 24 hours ago',
				);
			}
		}

		return {
			data: instanceToPlain(new ElectionEntity(election[0])),
			success: true,
		};
	}

	@Get('/:id')
	async getById(@Param('id') id: string) {
		const election = await this.electionsService.getById(id);

		if (!election) {
			throw new NotFoundException();
		}

		return {
			data: instanceToPlain(new ElectionEntity(election)),
			success: true,
		};
	}

	@Put('/create')
	@UseGuards(IsAdmin)
	async createElection(@Body() body: CreateElectionBody) {
		const current = await this.electionsService.getCurrentOpen();

		if (current) {
			throw new BadRequestException(
				'There is already an active election',
			);
		}

		const election = await this.electionsService.createElection(body);

		return {
			data: instanceToPlain(new ElectionEntity(election)),
			success: true,
		};
	}

	@Put('/candidates/me')
	@UseGuards(LoggedIn)
	async addCandidateMe(
		@Body() body: SubmitCandidacyBody,
		@CurrentUser() user: User,
	) {
		const current = await this.electionsService.getCurrentOpen();

		if (!current) {
			throw new NotFoundException(
				'There is no election currently active.',
			);
		}

		if (Date.now() > current.start.valueOf()) {
			throw new BadRequestException('Voting has already started');
		}

		const alreadyCandidate = await this.electionsService.getCandidateByUser(
			current.uuid,
			user.uuid,
		);

		if (alreadyCandidate) {
			throw new BadRequestException(
				'You are already a candidate for this election.',
			);
		}

		const candidate = await this.electionsService.createCandidate(
			current.uuid,
			user.uuid,
			body,
		);

		return {
			data: instanceToPlain(new CandidateEntity(candidate)),
			success: true,
		};
	}

	@Get('/candidates')
	async getCandidates() {
		const current = await this.electionsService.getCurrentOpen();

		if (!current) {
			throw new NotFoundException(
				'There is no election currently active.',
			);
		}

		const _candidates = await this.electionsService.queryCandidates({
			election: current.uuid,
		});

		const candidates = _candidates.map((c) =>
			instanceToPlain(new CandidateEntity(c)),
		);

		return {
			data: candidates,
			success: true,
		};
	}

	@Put('/vote')
	@UseGuards(LoggedIn)
	async vote(@Body() body: CastBallotBody, @CurrentUser() user: User) {
		const current = await this.electionsService.getCurrentVoting();

		if (!current) {
			throw new NotFoundException(
				'There is no election currently active.',
			);
		}

		const hasBallot = await this.electionsService.getBallot(
			current.uuid,
			user.uuid,
		);

		if (hasBallot) {
			await this.electionsService.discardBallot(current.uuid, user.uuid);
		}

		const candidates = await this.electionsService.queryCandidates({
			election: current.uuid,
		});

		const chiefCandidates = candidates
			.filter((c) => c.position === 'chief')
			.map((c) => c.uuid);

		const speakerCandidates = candidates
			.filter((c) => c.position === 'speaker')
			.map((c) => c.uuid);

		const { chief: _chief, speaker: _speaker } = body;

		const chief = [
			...new Set(_chief.filter((pick) => chiefCandidates.includes(pick))),
		];

		const speaker = [
			...new Set(
				_speaker.filter((pick) => speakerCandidates.includes(pick)),
			),
		];

		const ballot = await this.electionsService.castBallot(
			current.uuid,
			user.uuid,
			chief,
			speaker,
		);

		return {
			data: ballot,
			success: true,
		};
	}

	@Get('/ballot/my')
	@UseGuards(LoggedIn)
	async getBallot(@CurrentUser() user: User) {
		const current = await this.electionsService.getCurrentVoting();

		if (!current) {
			throw new NotFoundException(
				'There is no election currently active.',
			);
		}

		const ballot = await this.electionsService.getBallot(
			current.uuid,
			user.uuid,
		);

		if (!ballot) {
			throw new NotFoundException();
		}

		const timeSince = Date.now() - ballot.createdAt.valueOf();

		const sendChoices = timeSince < 10 * 60 * 1000;

		if (!sendChoices) {
			ballot.chief = undefined;
			ballot.speaker = undefined;
		}

		return {
			data: instanceToPlain(new BallotEntity(ballot)),
			success: true,
		};
	}

	@Get('/eligibility/candidacy')
	@UseGuards(LoggedIn)
	async getElgibility(@CurrentUser() user: User) {
		const current = await this.electionsService.getCurrentOpen();

		if (!current) {
			throw new NotFoundException(
				'There is no election currently active.',
			);
		}

		if (Date.now() > current.start.valueOf()) {
			throw new BadRequestException('Voting has already started');
		}

		const candidate = await this.electionsService.getCandidateByUser(
			current.uuid,
			user.uuid,
		);

		if (candidate) {
			throw new BadRequestException(
				'Already a candidate for this election',
			);
		}

		return {
			data: {
				eligible: true,
			},
			success: true,
		};
	}

	@Post('/_/result')
	@UseGuards(IsAdmin)
	async runElection(@Query('force') force: boolean) {
		const latest = await this.electionsService.getLatest();

		if (!latest || !latest[0]) {
			throw new NotFoundException(
				'There is no election currently active.',
			);
		}

		const current = latest[0];

		if (Date.now() < current.end.valueOf() && !force) {
			throw new BadRequestException("Voting hasn't ended");
		}

		const delta = Date.now() - current.end.valueOf();
		const oneDay = 24 * 60 * 60 * 1000;

		if (delta > oneDay) {
			throw new NotFoundException(
				'The latest election ended more than 24 hours ago',
			);
		}

		const ballots = await this.electionsService.getBallots(current.uuid);
		const candidates = await this.electionsService.queryCandidates({
			election: current.uuid,
		});

		const chiefCandidatesIndices = [];
		const chiefCandidatesNames = {};
		const chiefCandidateMap = {};
		const chiefReversedCandidateMap = {};

		const speakerCandidatesIndices = [];
		const speakerCandidatesNames = {};
		const speakerCandidateMap = {};
		const speakerReversedCandidateMap = {};

		let i = 1;

		for (const candidate of candidates.filter(
			(c) => c.position === 'chief',
		)) {
			chiefCandidatesIndices.push(i);

			chiefCandidatesNames[candidate.uuid] = candidate.name;

			chiefCandidateMap[i] = candidate.uuid;
			chiefReversedCandidateMap[candidate.uuid] = i;

			i++;
		}

		i = 1;

		for (const candidate of candidates.filter(
			(c) => c.position === 'speaker',
		)) {
			speakerCandidatesIndices.push(i);

			speakerCandidatesNames[candidate.uuid] = candidate.name;

			speakerCandidateMap[i] = candidate.uuid;
			speakerReversedCandidateMap[candidate.uuid] = i;

			i++;
		}

		const chiefBallots = ballots
			.map((ballot) => ballot.chief)
			.filter((ballot) => ballot.length > 0);

		const speakerBallots = ballots
			.map((ballot) => ballot.speaker)
			.filter((ballot) => ballot.length > 0);

		const chiefResults = irv.calculateWinner(
			Object.keys(chiefReversedCandidateMap),
			chiefCandidatesNames,
			chiefBallots,
		);

		const speakerResults = irv.calculateWinner(
			Object.keys(speakerReversedCandidateMap),
			speakerCandidatesNames,
			speakerBallots,
		);

		this.electionsService.saveElectionLog('chief', chiefResults.log);

		this.electionsService.saveElectionLog('speaker', speakerResults.log);

		if (chiefResults.winner === null || speakerResults.winner === null) {
			console.error('No winner was found', chiefResults, speakerResults);

			return {
				success: false,
				data: {
					chiefLog: chiefResults.log,
					speakerLog: speakerResults.log,
				},
			};
		}

		return {
			data: {
				chief: chiefResults,
				speaker: speakerResults,
			},
			success: true,
		};
	}

	@Get('/statistics')
	async getStatistics() {
		const election = await this.electionsService.getVotingLenient();

		if (!election) {
			throw new NotFoundException(
				'There is no election currently active.',
			);
		}

		const candidates = await this.electionsService.queryCandidates({
			election: election.uuid,
		});

		const ballots = await this.electionsService.getBallots(election.uuid);
		const users = await this.authService.query({});

		const turnout = ballots.length;
		const eligible = users.length;

		const turnoutPct = (turnout / eligible) * 100;

		const timestamps = ballots.map((b) => b.createdAt.valueOf());

		return {
			data: {
				turnout,
				eligible,
				percentage: turnoutPct,
				ballots: timestamps,
				candidates: candidates.length,
			},
			success: true,
		};
	}
}
