/*    */ package com.smartcare.backend.service;
/*    */ 
/*    */ import com.smartcare.backend.entity.CvcRecord;
/*    */ import com.smartcare.backend.repository.CvcRecordRepository;
/*    */ import java.util.List;
/*    */ import org.springframework.stereotype.Service;
/*    */ 
/*    */ @Service
/*    */ public class CvcService {
/*    */   public CvcService(CvcRecordRepository repository) {
/* 11 */     this.repository = repository;
/*    */   }
/*    */ 
/*    */   
/*    */   public CvcRecord save(CvcRecord record) {
/* 16 */     return (CvcRecord)this.repository.save(record);
/*    */   }
/*    */   private final CvcRecordRepository repository;
/*    */   public List<CvcRecord> findByPid(String pid) {
/* 20 */     return this.repository.findByPid(pid);
/*    */   }
/*    */   
/*    */   public CvcRecord findById(String id) {
/* 24 */     return this.repository.findById(id).orElse(null);
/*    */   }
/*    */   
/*    */   public void deleteById(String id) {
/* 28 */     this.repository.deleteById(id);
/*    */   }
/*    */ }


/* Location:              E:\深医\医院\重钢医院\AI\backend-from-0.0.1.jar!\com\smartcare\backend\service\CvcService.class
 * Java compiler version: 11 (55.0)
 * JD-Core Version:       1.1.3
 */