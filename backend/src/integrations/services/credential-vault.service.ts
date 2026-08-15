import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

@Injectable()
export class CredentialVaultService {
  encrypt(value: string) {
    const cleanValue = String(value ?? '').trim();
    if (!cleanValue) throw new BadRequestException('Credential degeri zorunludur.');

    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key(), iv);
    const encrypted = Buffer.concat([cipher.update(cleanValue, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return ['v1', iv.toString('base64'), tag.toString('base64'), encrypted.toString('base64')].join(':');
  }

  decrypt(value: string) {
    try {
      const [version, ivText, tagText, encryptedText] = String(value ?? '').split(':');
      if (version !== 'v1' || !ivText || !tagText || !encryptedText) {
        throw new Error('Invalid encrypted credential format.');
      }
      const decipher = createDecipheriv('aes-256-gcm', this.key(), Buffer.from(ivText, 'base64'));
      decipher.setAuthTag(Buffer.from(tagText, 'base64'));
      return Buffer.concat([decipher.update(Buffer.from(encryptedText, 'base64')), decipher.final()]).toString('utf8');
    } catch {
      throw new BadRequestException('Credential guvenli sekilde okunamadi. Encryption key kontrol edilmeli.');
    }
  }

  mask(value: string) {
    const cleanValue = String(value ?? '').trim();
    if (!cleanValue) return '';
    const visible = cleanValue.slice(-4);
    return cleanValue.length <= 4 ? '****' : `**** ${visible}`;
  }

  private key() {
    const configured = process.env.CREDENTIAL_ENCRYPTION_KEY?.trim();
    if (!configured) {
      throw new InternalServerErrorException('CREDENTIAL_ENCRYPTION_KEY tanimli degil.');
    }
    return createHash('sha256').update(configured).digest();
  }
}
