import { ApiProperty } from '@nestjs/swagger';
import {
	IsArray,
	IsDate,
	IsDateString,
	IsEnum,
	IsIn,
	IsNotEmpty,
	IsString,
} from 'class-validator';

export enum ElectionType {
	general,
	special,
}

export class CreateElectionBody {
	@IsNotEmpty()
	@IsEnum(ElectionType)
	@ApiProperty()
	type: 'general' | 'special';

	@IsNotEmpty()
	@IsString()
	@ApiProperty()
	title_en: string;

	@IsNotEmpty()
	@IsString()
	@ApiProperty()
	title_ol: string;

	@IsNotEmpty()
	@IsDateString()
	@ApiProperty()
	open: string;

	@IsNotEmpty()
	@IsDateString()
	@ApiProperty()
	start: string;

	@IsNotEmpty()
	@IsDateString()
	@ApiProperty()
	end: string;
}

export class SubmitCandidacyBody {
	@IsNotEmpty()
	@IsIn(['chief', 'speaker'])
	@ApiProperty()
	position: 'chief' | 'speaker';

	@IsNotEmpty()
	@IsString()
	@ApiProperty()
	name: string;

	@IsNotEmpty()
	@IsString()
	@ApiProperty()
	party: string | 'Independent';

	@IsNotEmpty()
	@IsArray()
	@ApiProperty()
	council: string[];
}

export class CastBallotBody {
	@IsNotEmpty()
	@IsArray()
	@ApiProperty()
	chief: string[];

	@IsNotEmpty()
	@IsArray()
	@ApiProperty()
	speaker: string[];
}
