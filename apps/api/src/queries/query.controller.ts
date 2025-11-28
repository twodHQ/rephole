import {Body, Controller, HttpCode, HttpStatus, Post} from '@nestjs/common';
import {QuerySearchRequest, QuerySearchResponse} from '../dto';
import {QueryService} from './query.service';
import {ApiBody, ApiOkResponse, ApiOperation, ApiTags} from '@nestjs/swagger';

@Controller('queries')
@ApiTags('Queries')
export class QueryController {

    constructor(private readonly queryService: QueryService) {
    }

    @Post('search')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Search for documents',
        description: 'Search for documents using a query',
    })
    @ApiBody({
        type: QuerySearchRequest,
        required: true,
        description: 'Search query',
    })
    @ApiOkResponse({
        type: QuerySearchResponse,
    })
    async search(@Body() params: QuerySearchRequest): Promise<QuerySearchResponse> {
        return this.queryService.search(params);
    }
}
