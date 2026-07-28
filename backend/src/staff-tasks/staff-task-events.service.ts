import { Injectable, MessageEvent } from '@nestjs/common';
import { concat, Observable, of, Subject } from 'rxjs';

@Injectable()
export class StaffTaskEventsService {
  private readonly events = new Subject<MessageEvent>();

  emit(type: string, data: unknown) {
    this.events.next({ type, data: data as string | object });
  }

  stream(): Observable<MessageEvent> {
    return concat(of({ type: 'connected', data: { ok: true } }), this.events.asObservable());
  }
}
