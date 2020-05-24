import { DynamicModule, Module, Type } from '@nestjs/common';
import { SearchService } from './search.service';

export interface SearchModuleOptions {
  searchService: Type<SearchService>;
}

@Module({})
export class SearchModule {
  static forConfiguration(options: SearchModuleOptions): DynamicModule {
    return {
      module: SearchModule,
      providers: [
        {
          provide: SearchService,
          useClass: options.searchService,
        },
      ],
      exports: [
        {
          provide: SearchService,
          useClass: options.searchService,
        },
      ],
    };
  }
}
