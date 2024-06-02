import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type GeneralBallotDocument = HydratedDocument<GeneralBallot>;

@Schema()
export class GeneralBallot {
	/**
	 * General (election) ballot UUID
	 */
	@Prop({ required: true })
	uuid: string;

	/**
	 * Hash of the UUID of the voter who cast this ballot
	 */
	@Prop({ required: true })
	voter: string;

	/**
	 * UUID of the election to which this ballot corresponds
	 */
	@Prop({ required: true })
	election: string;

	/**
	 * ordered string array of the picks for chief
	 */
	@Prop({ required: true })
	chief: string[];

	/**
	 * ordered string array of the picks for speaker
	 */
	@Prop({ required: true })
	speaker: string[];

	/**
	 * The date at which the page was created.
	 */
	@Prop({ required: true })
	createdAt: Date;
}

export const GeneralBallotSchema = SchemaFactory.createForClass(GeneralBallot);
