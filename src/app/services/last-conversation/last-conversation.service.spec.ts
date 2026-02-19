import { TestBed } from '@angular/core/testing';

import { LastConversationService } from './last-conversation.service';

describe('LastConversationService', () => {
  let service: LastConversationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LastConversationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
