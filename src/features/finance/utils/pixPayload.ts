function tlv(id: string, value: string): string {
  return `${id}${value.length.toString().padStart(2, '0')}${value}`
}

function crc16(str: string): string {
  let crc = 0xffff
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1
      crc &= 0xffff
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

export interface PixPayloadParams {
  pixKey: string
  amount: number
  merchantName: string
  merchantCity: string
  txId?: string
  description?: string
}

export function buildPixPayload(params: PixPayloadParams): string {
  const { pixKey, amount, merchantName, merchantCity, txId = '***', description } = params

  const gui = tlv('00', 'BR.GOV.BCB.PIX')
  const key = tlv('01', pixKey)
  const desc = description ? tlv('02', description.slice(0, 72)) : ''
  const merchantAccount = tlv('26', gui + key + desc)
  const additionalData = tlv('62', tlv('05', txId.slice(0, 25).padEnd(1, '*') || '***'))

  let payload = ''
  payload += tlv('00', '01')
  payload += merchantAccount
  payload += tlv('52', '0000')
  payload += tlv('53', '986')
  if (amount > 0) payload += tlv('54', amount.toFixed(2))
  payload += tlv('58', 'BR')
  payload += tlv('59', merchantName.slice(0, 25))
  payload += tlv('60', merchantCity.slice(0, 15))
  payload += additionalData
  payload += '6304'

  return payload + crc16(payload)
}
