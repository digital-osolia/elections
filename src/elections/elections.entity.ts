import { Exclude, Expose } from 'class-transformer';
import { Election } from './schemas/election.schema';
import { BilingualEntry } from '@/utils/body';

@Exclude()
export class ElectionEntity {
	@Expose({ name: 'id' }) uuid: string;

	@Expose() type: 'general' | 'special';
	@Expose() createdAt: string;

	// we set this ourselves
	@Expose() title: BilingualEntry[];

	@Expose() start: string;
	@Expose() open: string;
	@Expose() end: string;

	constructor(partial: Partial<Election>) {
		Object.assign(this, partial);

		this.title = [
			{
				language: 'en',
				value: partial.title_en,
			},
			{
				language: 'ol',
				value: partial.title_ol,
			},
		];
	}
}

@Exclude()
export class CandidateEntity {
	@Expose({ name: 'id' }) uuid: string;

	@Expose() position: 'chief' | 'speaker';
	@Expose() createdAt: string;
	@Expose() election: string;

	// we set this ourselves
	@Expose() name: string;
	@Expose() party: string;
	@Expose() council: string[];

	constructor(partial: Partial<Election>) {
		Object.assign(this, partial);
	}
}

@Exclude()
export class BallotEntity {
	@Expose({ name: 'id' }) uuid: string;

	@Expose() createdAt: string;
	@Expose() election: string;

	@Expose() chief: string[];
	@Expose() speaker: string[];

	constructor(partial: Partial<Election>) {
		Object.assign(this, partial);
	}
}
