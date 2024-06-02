import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ElectionDocument = HydratedDocument<Election>;

@Schema()
export class Election {
	/**
	 * Election UUID
	 */
	@Prop({ required: true })
	uuid: string;

	@Prop({ required: true })
	type: 'general' | 'special';

	/**
	 * Title of the election in English
	 */
	@Prop({ required: true })
	title_en: string;

	/**
	 * Title of the election in Osol
	 */
	@Prop({ required: false })
	title_ol: string;

	/**
	 * The date at which candidacy opens.
	 */
	@Prop({ required: true })
	open: Date;

	/**
	 * The date at which voting opens.
	 */
	@Prop({ required: true })
	start: Date;

	/**
	 * The date at which the election ends.
	 */
	@Prop({ required: true })
	end: Date;

	/**
	 * The date at which the page was created.
	 */
	@Prop({ required: true })
	createdAt: Date;
}

export const ElectionSchema = SchemaFactory.createForClass(Election);
