/*    */ package com.smartcare.backend.service;
/*    */ 
/*    */ import com.smartcare.backend.entity.RmRecord;
/*    */ import com.smartcare.backend.repository.RmRecordRepository;
/*    */ import java.util.List;
/*    */ import org.springframework.stereotype.Service;
/*    */ 
/*    */ @Service
/*    */ public class RmService {
/*    */   public RmService(RmRecordRepository repository) {
/* 11 */     this.repository = repository;
/*    */   }
/*    */ 
/*    */   
/*    */   public RmRecord save(RmRecord record) {
/* 16 */     return (RmRecord)this.repository.save(record);
/*    */   }
/*    */   private final RmRecordRepository repository;
/*    */   public List<RmRecord> findByPid(String pid) {
/* 20 */     return this.repository.findByPid(pid);
/*    */   }
/*    */   
/*    */   public RmRecord findById(String id) {
/* 24 */     return this.repository.findById(id).orElse(null);
/*    */   }
/*    */   
/*    */   public void deleteById(String id) {
/* 28 */     this.repository.deleteById(id);
/*    */   }
/*    */ }


/* Location:              E:\深医\医院\重钢医院\AI\backend-from-0.0.1.jar!\com\smartcare\backend\service\RmService.class
 * Java compiler version: 11 (55.0)
 * JD-Core Version:       1.1.3
 */