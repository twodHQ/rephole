import {IsInt, IsOptional, IsString, Max, Min} from 'class-validator';
import {ApiProperty} from "@nestjs/swagger";

export class QuerySearchRequest {
    @ApiProperty({
        description: 'Search query',
        required: true,
    })
    @IsString()
    prompt: string;

    @ApiProperty({
        description: 'Number of results to return',
        required: false,
        default: 10,
    })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(100)
    k?: number;
}

export class QuerySearchResponse {
    results: string[];
}
