import SqlQueryResult from '../sql/sqlQueryResult';
import KnowledgeBaseApiClient from './knowledge_baseApiClient';

/**
 * Represent MindsDB Knowledge Base and all supported operations.
 */
export default class KnowledgeBase {
  /** API client for executing Knowledge Base operations   */
  knowledgeBaseApiClient: KnowledgeBaseApiClient;
  /** Name of Knowledge Base */
  name: string;
  /** Project name in which knowledge base belongs */
  project: string;
  /** Table name of knowledge base */
  tableName: string;
  /** Storage name of knowledge base */
  storage: string | null;
  /** Name of Embedding model used */
  model: string | null;
  /** Params for knowledge base in JSON Object */
  params: any;
  /** Metadata columns name */
  metadataColumns: Array<string>;
  /** Content column names (default content) */
  contentColumns: Array<string>;
  /** ID column name */
  idColumn: string;
  /** Query string for knowledge base */
  query: string | null;
  /** Value to limit the knowledge base output result */
  limit: number | null | undefined;
  /** SQL query for knowledge base */
  sql: string;

  /**
   * Constructor for Knowledge Base
   *
   * @param {KnowledgeBaseApiClient} knowledgeBaseApiClient - API client for executing Knowledge Base operations
   * @param {string} project - Project name in which knowledge base belongs
   * @param {any} data - Knowledge Base data in JSON Object
   */
  constructor(
    knowledgeBaseApiClient: KnowledgeBaseApiClient,
    project: string,
    data: any
  ) {
    this.knowledgeBaseApiClient = knowledgeBaseApiClient;
    this.project = project;
    this.name = data.name;
    this.tableName = `${project}.${this.name}`;
    this.storage = data.storage || null;
    this.model = data.model || null;
    let params: any = data.params || {};
    if (typeof params === 'string') {
      try {
        params = JSON.parse(params);
      } catch (error) {
        params = {};
      }
    }

    this.metadataColumns = params['metadata_columns'] || [];
    this.contentColumns = params['content_columns'] || [];
    this.idColumn = params['id_column'] || null;

    this.params = params;

    this.query = null;
    this.limit = null;
    this.sql = `SELECT * FROM ${this.tableName};`;
    this.updateQuery();
  }

  // Private method to generate SQL query for knowledge base
  private updateQuery() {
    let astQuery: string = `SELECT * FROM ${this.tableName}`;
    if (this.query) {
      astQuery += ` WHERE CONTENT = '${this.query}'`;
    }

    if (this.limit) {
      astQuery += ` LIMIT ${this.limit}`;
    }

    astQuery += ';';
    this.sql = astQuery;
  }

  /**
   * Insert Web Pages into Knowledge Base
   *
   * @param {Array<string>} urls - Array of URLs
   * @param {number} crawlDepth - Depth of crawl
   * @param {Array<string>} filters - Array of filters
   */
  async insertWebPages(
    urls: Array<string>,
    crawlDepth: number = 1,
    filters: Array<string> | null = null
  ) {
    await this.knowledgeBaseApiClient.insertWebpagesIntoKnowledgeBase(
      this.project,
      this.name,
      urls,
      crawlDepth,
      filters
    );
  }

  /**
   * Query Knowledge Base for given query and limit
   *
   * @param {string} query - Query string (e.g. 'apple')
   * @param {number} limit - Limit the output result
   * @returns {KnowledgeBase} - New Knowledge Base object
   */
  find(query: string, limit: number | undefined | null): KnowledgeBase {
    const clonedKnowledgeBase = new KnowledgeBase(
      this.knowledgeBaseApiClient,
      this.project,
      JSON.parse(
        JSON.stringify({
          name: this.name,
          storage: this.storage,
          model: this.model,
          params: this.params,
        })
      )
    );
    clonedKnowledgeBase.query = query;
    clonedKnowledgeBase.limit = limit;
    clonedKnowledgeBase.updateQuery();
    return clonedKnowledgeBase;
  }

  /**
   * Insert data into Knowledge Base
   * kb.insert([{column1: value1, column2: value2}]);
   *
   * @param {Array<any>} records - Array of JSON object
   */
  async insert(records: Array<any>) {
    let valueString = '';
    records.forEach((row) => {
      valueString += '(';
      Object.values(row).forEach((cellValue, index, array) => {
        if (typeof cellValue === 'string') {
          // Escape single quotes
          cellValue = cellValue.replace(/'/g, "\\'");
          // Escape double quotes
          cellValue = (cellValue as string).replace(/"/g, '\\"');
          valueString += `'${cellValue}'`;
        } else {
          valueString += cellValue;
        }
        if (index < array.length - 1) {
          valueString += ', ';
        }
      });
      valueString += '), ';
    });

    // Remove the trailing comma and space
    valueString = valueString.slice(0, -2);

    const columnNames = Object.keys(records[0]).join(', ');

    const sqlQuery = `INSERT INTO ${this.tableName} (${columnNames}) VALUES ${valueString};`;
    console.log(sqlQuery);
    await this.knowledgeBaseApiClient.insertDataIntoKnowledgeBase(sqlQuery);
  }

  /**
   * Fetch data from Knowledge Base
   *
   * @returns {SqlQueryResult} - Result of SQL query
   */
  async fetch(): Promise<SqlQueryResult> {
    return await this.knowledgeBaseApiClient.fetch(this.sql);
  }
}