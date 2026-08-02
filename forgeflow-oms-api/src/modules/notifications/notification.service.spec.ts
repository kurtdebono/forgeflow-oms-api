import { Test } from '@nestjs/testing';
import { EMAIL_PROVIDER } from './email-provider.interface';
import type { EmailProvider } from './email-provider.interface';
import { NotificationService } from './notifications.service';

type EmailProviderMock = jest.Mocked<Pick<EmailProvider, 'sendEmail'>>;

describe('NotificationSerivce', () => {
  let notificationService: NotificationService;
  let emailProviderMock: EmailProviderMock;

  const originalEnv = process.env;

  beforeEach(async () => {
    process.env = {
      ...originalEnv,
      OPS_REVIEW_EMAIL: 'ops@example.com',
    };

    emailProviderMock = {
      sendEmail: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: EMAIL_PROVIDER,
          useValue: emailProviderMock,
        },
      ],
    }).compile();

    notificationService = moduleRef.get(NotificationService);
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  it('sends a manual review alert email', async () => {
    await notificationService.sendManualReviewAlert({
      orderId: 'order-1',
      priority: 'HIGH',
      summary: 'High priority order requires review.',
      riskFlags: ['Missing shipping address', 'Payment status uncler'],
      recommendedActions: [
        'Verify payment.',
        'Contact customer for shipping details.',
      ],
    });

    expect(emailProviderMock.sendEmail).toHaveBeenCalledTimes(1);

    expect(emailProviderMock.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'ops@example.com',
        subject: 'ForgeFlow manual review required: Order order-1',
        html: expect.stringContaining(
          'High priority order requires review.',
        ) as string,
        text: expect.stringContaining(
          'High priority order requires review.',
        ) as string,
      }),
    );

    expect(emailProviderMock.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining('Missing shipping address') as string,
        text: expect.stringContaining('Missing shipping address') as string,
      }),
    );
  });

  it('does not send an email when OPS_REVIEW_EMAIL is not configured', async () => {
    delete process.env.OPS_REVIEW_EMAIL;

    await notificationService.sendManualReviewAlert({
      orderId: 'order-1',
      priority: 'HIGH',
      summary: 'High priority order requires review.',
      riskFlags: ['Missing shipping address', 'Payment status uncler'],
      recommendedActions: [
        'Verify payment.',
        'Contact customer for shipping details.',
      ],
    });

    expect(emailProviderMock.sendEmail).not.toHaveBeenCalled();
  });
});
