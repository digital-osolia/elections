import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Election, ElectionSchema } from './schemas/election.schema';
import { Candidate, CandidateSchema } from './schemas/candidate.schema';
import {
	GeneralBallot,
	GeneralBallotSchema,
} from './schemas/ballot.general.schema';
import { ElectionsController } from './elections.controller';
import { ElectionsService } from './elections.service';

@Module({
	imports: [
		MongooseModule.forFeature([
			{ name: Election.name, schema: ElectionSchema },
			{ name: Candidate.name, schema: CandidateSchema },
			{ name: GeneralBallot.name, schema: GeneralBallotSchema },
		]),
	],
	controllers: [ElectionsController],
	providers: [ElectionsService],
})
export class ElectionsModule {}
