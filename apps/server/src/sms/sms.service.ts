import { Injectable, Logger } from '@nestjs/common';
import Dysmsapi20170525, * as dysmsapi from '@alicloud/dysmsapi20170525';
import * as OpenApi from '@alicloud/openapi-client';
// import * as Util from '@alicloud/tea-util';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private client: Dysmsapi20170525 | null = null;

  constructor() {
    const accessKeyId = process.env.ALIBABA_CLOUD_ACCESS_KEY_ID;
    const accessKeySecret = process.env.ALIBABA_CLOUD_ACCESS_KEY_SECRET;
    const region = process.env.ALIBABA_CLOUD_SMS_REGION || 'cn-hangzhou';

    if (accessKeyId && accessKeySecret) {
      const config = new OpenApi.Config({
        accessKeyId,
        accessKeySecret,
        endpoint: `dysmsapi.${region}.aliyuncs.com`,
      });
      this.client = new Dysmsapi20170525(config);
      this.logger.log('阿里云短信服务已初始化');
    } else {
      this.logger.warn('未配置阿里云短信密钥，短信将以日志模式运行');
    }
  }

  /**
   * 发送短信验证码
   * @param phone 手机号
   * @param code 验证码
   * @param templateCode 短信模板 CODE，不传则用环境变量
   */
  async sendCode(
    phone: string,
    code: string,
    templateCode?: string,
  ): Promise<boolean> {
    const tplCode = templateCode || process.env.ALIBABA_CLOUD_SMS_TEMPLATE_CODE;
    const signName = process.env.ALIBABA_CLOUD_SMS_SIGN_NAME || 'AI知识库';

    // 未配置或开发模式：仅日志输出
    if (!this.client || !tplCode) {
      this.logger.warn(`[DEV SMS] ${phone} -> 验证码: ${code}`);
      return true;
    }

    const sendReq = new dysmsapi.SendSmsRequest({
      phoneNumbers: phone,
      signName,
      templateCode: tplCode,
      templateParam: JSON.stringify({ code }),
    });

    try {
      const resp = await this.client.sendSms(sendReq);
      const ok = resp.body?.code === 'OK';
      if (!ok) {
        this.logger.error(
          `短信发送失败: ${resp.body?.code} - ${resp.body?.message}`,
        );
      }
      return ok;
    } catch (err) {
      this.logger.error('短信发送异常', err);
      return false;
    }
  }
}
