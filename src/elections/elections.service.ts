import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { GeneralBallot } from './schemas/ballot.general.schema';
import { Candidate } from './schemas/candidate.schema';
import { Election } from './schemas/election.schema';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

@Injectable()
export class ElectionsService {
	constructor(
		@InjectModel(Candidate.name)
		private candidateModel: Model<Candidate>,
		@InjectModel(GeneralBallot.name)
		private ballotModel: Model<GeneralBallot>,
		@InjectModel(Election.name)
		private electionModel: Model<Election>,
	) {}

	async getLatest(): Promise<Election[]> {
		return await this.electionModel
			.find()
			.sort('-open')
			.limit(1)
			.lean(true)
			.exec();
	}

	async getCurrentOpen(): Promise<Election> {
		const latest = await this.getLatest();

		if (!latest || latest.length === 0) return null;

		const first = latest[0];

		const early = Date.now() < first.open.valueOf();
		const late = first.end.valueOf() < Date.now();

		if (!first || early || late) return null;

		return first;
	}

	async getCurrentVoting(): Promise<Election> {
		const latest = await this.getLatest();

		if (!latest || latest.length === 0) return null;

		const first = latest[0];

		const early = Date.now() < first.start.valueOf();
		const late = first.end.valueOf() < Date.now();

		if (!first || early || late) return null;

		return first;
	}

	async getById(id: string): Promise<Election> {
		return await this.electionModel.findOne({ uuid: id }).lean(true).exec();
	}

	async createElection(body: any): Promise<Election> {
		const uuid = uuidv4();

		return await new this.electionModel({
			...body,
			uuid,
			createdAt: Date.now(),
		}).save();
	}

	async getCandidateByUser(election: string, id: string): Promise<Candidate> {
		return await this.candidateModel
			.findOne({ candidate: id, election })
			.lean(true)
			.exec();
	}

	async queryCandidates(query: Partial<Candidate>): Promise<Candidate[]> {
		return await this.candidateModel.find(query).lean(true).exec();
	}

	async createCandidate(
		election: string,
		candidate: string,
		body: any,
	): Promise<Candidate> {
		const uuid = uuidv4();

		return await new this.candidateModel({
			...body,
			uuid,
			election,
			candidate,
			createdAt: Date.now(),
		}).save();
	}

	async getBallot(election: string, id: string): Promise<GeneralBallot> {
		const hashed = crypto.createHash('sha256').update(id).digest('hex');

		return await this.ballotModel
			.findOne({ election, voter: hashed })
			.lean(true)
			.exec();
	}

	async discardBallot(election: string, id: string) {
		const hashed = crypto.createHash('sha256').update(id).digest('hex');

		await this.ballotModel
			.deleteOne({ election, voter: hashed })
			.lean(true)
			.exec();
	}

	async castBallot(
		election: string,
		id: string,
		chief: string[],
		speaker: string[],
	) {
		const hashed = crypto.createHash('sha256').update(id).digest('hex');
		const uuid = uuidv4();

		const ballot = new this.ballotModel({
			uuid,
			chief,
			speaker,
			election,
			voter: hashed,
			createdAt: Date.now(),
		});

		await ballot.save();

		return ballot;
	}

	async getBallots(election: string) {
		return await this.ballotModel.find({ election }).lean(true).exec();
	}

	async saveElectionLog(type: 'chief' | 'speaker', log: string[]) {
		const today = new Date().toString();
		const logText = log.join('\n');

		console.log(`Saving election log to ${__dirname}/${type}_${today}.txt`);

		if (!fs.existsSync(`${__dirname}/election_logs`)) {
			fs.mkdirSync(`${__dirname}/election_logs`);
		}

		fs.writeFileSync(
			`${__dirname}/election_logs/${type}_${today}.txt`,
			logText,
		);
	}
}
