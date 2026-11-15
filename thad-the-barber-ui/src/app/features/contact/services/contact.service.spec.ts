import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ContactReceipt } from '../dtos/contact-receipt.dto';
import { ContactRequest } from '../dtos/contact-request.dto';
import { ContactCategory } from '../models/contact-category.model';
import { CONTACT_URL, ContactService } from './contact.service';

describe(
  'ContactService',
  (): void => {
    beforeEach((): void => {
      TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    });

    afterEach((): void => {
      TestBed.inject(HttpTestingController).verify();
    });

    it(
      'posts the message and returns its receipt',
      (): void => {
        const request: ContactRequest = {
          category: ContactCategory.Feedback,
          message: 'Made-up feedback.',
        };
        let receipt: ContactReceipt | undefined;
        TestBed.inject(ContactService).sendMessage(request).subscribe((sent: ContactReceipt): void => {
          receipt = sent;
        });

        const call: TestRequest = TestBed.inject(HttpTestingController).expectOne(CONTACT_URL);
        call.flush({ id: 'made-up-receipt' }, { status: 201, statusText: 'Created' });

        expect(call.request.method).toBe('POST');
        expect(call.request.body).toEqual(request);
        expect(receipt).toEqual({ id: 'made-up-receipt' });
      },
    );
  },
);
