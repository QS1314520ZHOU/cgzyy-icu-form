/*    */ package com.smartcare.backend.service;
/*    */ 
/*    */ import com.smartcare.backend.entity.CrrtRecord;
/*    */ import com.smartcare.backend.repository.CrrtRecordRepository;
/*    */ import java.util.List;
/*    */ import org.springframework.stereotype.Service;
/*    */ 
/*    */ @Service
/*    */ public class CrrtService {
/*    */   public CrrtService(CrrtRecordRepository repository) {
/* 11 */     this.repository = repository;
/*    */   }
/*    */ 
/*    */   
/*    */   public CrrtRecord save(CrrtRecord record) {
/* 16 */     return (CrrtRecord)this.repository.save(record);
/*    */   }
/*    */   private final CrrtRecordRepository repository;
/*    */   public List<CrrtRecord> findByPid(String pid) {
/* 20 */     return this.repository.findByPid(pid);
/*    */   }
/*    */   
/*    */   public CrrtRecord findById(String id) {
/* 24 */     return this.repository.findById(id).orElse(null);
/*    */   }
/*    */   
/*    */   public void deleteById(String id) {
/* 28 */     this.repository.deleteById(id);
/*    */   }
/*    */ }


/* Location:              E:\深医\医院\重钢医院\AI\backend-from-0.0.1.jar!\com\smartcare\backend\service\CrrtService.class
 * Java compiler version: 11 (55.0)
 * JD-Core Version:       1.1.3
 */