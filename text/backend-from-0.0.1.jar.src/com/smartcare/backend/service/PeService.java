/*    */ package com.smartcare.backend.service;
/*    */ 
/*    */ import com.smartcare.backend.entity.PeRecord;
/*    */ import com.smartcare.backend.repository.PeRecordRepository;
/*    */ import java.util.List;
/*    */ import org.springframework.stereotype.Service;
/*    */ 
/*    */ @Service
/*    */ public class PeService {
/*    */   public PeService(PeRecordRepository repository) {
/* 11 */     this.repository = repository;
/*    */   }
/*    */ 
/*    */   
/*    */   public PeRecord save(PeRecord record) {
/* 16 */     return (PeRecord)this.repository.save(record);
/*    */   }
/*    */   private final PeRecordRepository repository;
/*    */   public List<PeRecord> findByPid(String pid) {
/* 20 */     return this.repository.findByPid(pid);
/*    */   }
/*    */   
/*    */   public PeRecord findById(String id) {
/* 24 */     return this.repository.findById(id).orElse(null);
/*    */   }
/*    */   
/*    */   public void deleteById(String id) {
/* 28 */     this.repository.deleteById(id);
/*    */   }
/*    */ }


/* Location:              E:\深医\医院\重钢医院\AI\backend-from-0.0.1.jar!\com\smartcare\backend\service\PeService.class
 * Java compiler version: 11 (55.0)
 * JD-Core Version:       1.1.3
 */