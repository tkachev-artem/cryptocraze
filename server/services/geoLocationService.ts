import geoip from 'geoip-lite';

/**
 * Сервис для определения геолокации по IP адресу
 */
export class GeoLocationService {
  /**
   * Получить код страны по IP адресу
   * @param ip IP адрес пользователя
   * @returns Код страны (ISO 3166-1 alpha-2) или 'Unknown'
   */
  static getCountryFromIP(ip: string): string {
    try {
      // Пропускаем локальные IP адреса
      if (!ip || ip === '::1' || ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
        return 'Unknown';
      }

      const geo = geoip.lookup(ip);
      return geo?.country || 'Unknown';
    } catch (error) {
      console.error('Error determining country from IP:', error);
      return 'Unknown';
    }
  }

  /**
   * Получить полную информацию о геолокации по IP адресу
   * @param ip IP адрес пользователя
   * @returns Объект с информацией о геолокации или null
   */
  static getLocationFromIP(ip: string): geoip.Lookup | null {
    try {
      if (!ip || ip === '::1' || ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
        return null;
      }

      return geoip.lookup(ip);
    } catch (error) {
      console.error('Error determining location from IP:', error);
      return null;
    }
  }

  /**
   * Получить все доступные страны
   * @returns Объект с кодами стран как ключи и названиями как значения
   */
  static getAllCountries(): Record<string, string> {
    return {
      'US': 'United States',
      'RU': 'Russia',
      'DE': 'Germany',
      'GB': 'United Kingdom',
      'FR': 'France',
      'IT': 'Italy',
      'ES': 'Spain',
      'CA': 'Canada',
      'AU': 'Australia',
      'JP': 'Japan',
      'CN': 'China',
      'IN': 'India',
      'BR': 'Brazil',
      'MX': 'Mexico',
      'NL': 'Netherlands',
      'SE': 'Sweden',
      'NO': 'Norway',
      'DK': 'Denmark',
      'FI': 'Finland',
      'PL': 'Poland',
      'TR': 'Turkey',
      'KR': 'South Korea',
      'TH': 'Thailand',
      'SG': 'Singapore',
      'MY': 'Malaysia',
      'ID': 'Indonesia',
      'PH': 'Philippines',
      'VN': 'Vietnam',
      'UA': 'Ukraine',
      'CZ': 'Czech Republic',
      'HU': 'Hungary',
      'RO': 'Romania',
      'BG': 'Bulgaria',
      'HR': 'Croatia',
      'RS': 'Serbia',
      'BA': 'Bosnia and Herzegovina',
      'SI': 'Slovenia',
      'SK': 'Slovakia',
      'EE': 'Estonia',
      'LV': 'Latvia',
      'LT': 'Lithuania',
      'BY': 'Belarus',
      'MD': 'Moldova',
      'GE': 'Georgia',
      'AM': 'Armenia',
      'AZ': 'Azerbaijan',
      'KZ': 'Kazakhstan',
      'UZ': 'Uzbekistan',
      'KG': 'Kyrgyzstan',
      'TJ': 'Tajikistan',
      'TM': 'Turkmenistan',
      'IR': 'Iran',
      'IQ': 'Iraq',
      'SA': 'Saudi Arabia',
      'AE': 'United Arab Emirates',
      'IL': 'Israel',
      'EG': 'Egypt',
      'ZA': 'South Africa',
      'NG': 'Nigeria',
      'KE': 'Kenya',
      'MA': 'Morocco',
      'DZ': 'Algeria',
      'TN': 'Tunisia',
      'LY': 'Libya',
      'SD': 'Sudan',
      'ET': 'Ethiopia',
      'GH': 'Ghana',
      'Unknown': 'Unknown'
    };
  }

  /**
   * Получить название страны по коду страны
   * @param countryCode Код страны (ISO 3166-1 alpha-2)
   * @returns Название страны или код страны если название не найдено
   */
  static getCountryName(countryCode: string): string {
    const countryNames = this.getAllCountries();
    return countryNames[countryCode] || countryCode;
  }

  /**
   * Проверить, является ли IP адрес локальным
   * @param ip IP адрес
   * @returns true если IP адрес локальный
   */
  static isLocalIP(ip: string): boolean {
    if (!ip) return true;
    
    return ip === '::1' || 
           ip === '127.0.0.1' || 
           ip.startsWith('192.168.') || 
           ip.startsWith('10.') ||
           ip.startsWith('172.16.') ||
           ip.startsWith('172.17.') ||
           ip.startsWith('172.18.') ||
           ip.startsWith('172.19.') ||
           ip.startsWith('172.2') ||
           ip.startsWith('172.30') ||
           ip.startsWith('172.31');
  }
}
