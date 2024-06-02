import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CandidateDocument = HydratedDocument<Candidate>;

@Schema()
export class Candidate {
	/**
	 * Candidate UUID
	 */
	@Prop({ required: true })
	uuid: string;

	/**
	 * UUID of the candidate (user schema)
	 */
	@Prop({ required: true })
	candidate: string;

	/**
	 * Name of the candidate
	 */
	@Prop({ required: true })
	name: string;

	/**
	 * UUID of the election to which this candidacy corresponds
	 */
	@Prop({ required: true })
	election: string;

	@Prop({ required: true })
	position: 'chief' | 'speaker';

	@Prop({ required: true })
	party: string | 'Independent';

	@Prop({ required: false })
	council: string[];

	/**
	 * The date at which the page was created.
	 */
	@Prop({ required: true })
	createdAt: Date;
}

export const CandidateSchema = SchemaFactory.createForClass(Candidate);
