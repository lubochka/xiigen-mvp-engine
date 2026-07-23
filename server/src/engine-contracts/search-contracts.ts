export interface SearchClause {
  [clauseType: string]: Record<string, unknown>;
}

export interface SearchQuery {
  must: SearchClause[];
  should?: SearchClause[];
  must_not?: SearchClause[];
  size?: number;
  from?: number;
}

export interface ISearchPublishFilter {
  applyFilter(query: SearchQuery): SearchQuery;
}

export class SearchPublishFilterImpl implements ISearchPublishFilter {
  applyFilter(query: SearchQuery): SearchQuery {
    const publishedClause: SearchClause = { term: { status: 'PUBLISHED' } };
    return { ...query, must: [publishedClause, ...query.must] };
  }
}
