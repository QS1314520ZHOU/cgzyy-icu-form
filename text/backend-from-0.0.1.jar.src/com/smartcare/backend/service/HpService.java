/*    */ package com.smartcare.backend.service;
/*    */ 
/*    */ import com.smartcare.backend.entity.HpRecord;
/*    */ import com.smartcare.backend.repository.HpRecordRepository;
/*    */ import java.util.List;
/*    */ import org.springframework.stereotype.Service;
/*    */ 
/*    */ @Service
/*    */ public class HpService {
/*    */   public HpService(HpRecordRepository repository) {
/* 11 */     this.repository = repository;
/*    */   }
/*    */ 
/*    */   
/*    */   public HpRecord save(HpRecord record) {
/* 16 */     return (HpRecord)this.repository.save(record);
/*    */   }
/*    */   private final HpRecordRepository repository;
/*    */   public List<HpRecord> findByPid(String pid) {
/* 20 */     return this.repository.findByPid(pid);
/*    */   }
/*    */   
/*    */   public HpRecord findById(String id) {
/* 24 */     return this.repository.findById(id).orElse(null);
/*    */   }
/*    */   
/*    */   public void deleteById(String id) {
/* 28 */     this.repository.deleteById(id);
/*    */   }
/*    */ }


/* Location:              E:\深医\医院\重钢医院\AI\backend-from-0.0.1.jar!\com\smartcare\backend\service\HpService.class
 * Java compiler version: 11 (55.0)
 * JD-Core Version:       1.1.3
 */