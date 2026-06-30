import { Injectable } from '@angular/core';
import { SmartCareData } from '../models/smartcare.model';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private readonly STORAGE_KEY = 'ICU_HOST_DATA';
  private readonly STORAGE_TIME_KEY = 'ICU_HOST_DATA_TIME';

  /**
   * 持久化数据
   */
  persist(data: SmartCareData): void {
    try {
      sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
      sessionStorage.setItem(this.STORAGE_TIME_KEY, String(Date.now()));
    } catch (e) {
      console.error('[StorageService] 持久化失败:', e);
    }
  }

  /**
   * 恢复数据
   */
  restore(): { data: SmartCareData; time: number } | null {
    try {
      const cached = sessionStorage.getItem(this.STORAGE_KEY);
      if (!cached) return null;

      const data = JSON.parse(cached);
      const time = Number(sessionStorage.getItem(this.STORAGE_TIME_KEY) || 0);

      return { data, time };
    } catch (e) {
      console.error('[StorageService] 恢复失败:', e);
      return null;
    }
  }

  /**
   * 清除数据
   */
  clear(): void {
    try {
      sessionStorage.removeItem(this.STORAGE_KEY);
      sessionStorage.removeItem(this.STORAGE_TIME_KEY);
    } catch (e) {
      console.error('[StorageService] 清除失败:', e);
    }
  }

  /**
   * 检查是否有缓存
   */
  hasStoredPayload(): boolean {
    try {
      return Boolean(sessionStorage.getItem(this.STORAGE_KEY));
    } catch {
      return false;
    }
  }
}
