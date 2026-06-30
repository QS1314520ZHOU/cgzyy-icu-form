/*    */ package com.smartcare.backend.service;
/*    */ 
/*    */ import com.smartcare.backend.entity.ProteinARecord;
/*    */ import com.smartcare.backend.repository.ProteinARecordRepository;
/*    */ import java.util.List;
/*    */ import org.springframework.stereotype.Service;
/*    */ 
/*    */ @Service
/*    */ public class ProteinAService {
/*    */   public ProteinAService(ProteinARecordRepository repository) {
/* 11 */     this.repository = repository;
/*    */   }
/*    */ 
/*    */   
/*    */   public ProteinARecord save(ProteinARecord record) {
/* 16 */     return (ProteinARecord)this.repository.save(record);
/*    */   }
/*    */   private final ProteinARecordRepository repository;
/*    */   public List<ProteinARecord> findByPid(String pid) {
/* 20 */     return this.repository.findByPid(pid);
/*    */   }
/*    */   
/*    */   public ProteinARecord findById(String id) {
/* 24 */     return this.repository.findById(id).orElse(null);
/*    */   }
/*    */   
/*    */   public void deleteById(String id) {
/* 28 */     this.repository.deleteById(id);
/*    */   }
/*    */ }


/* Location:              E:\深医\医院\重钢医院\AI\backend-from-0.0.1.jar!\com\smartcare\backend\service\ProteinAService.class
 * Java compiler version: 11 (55.0)
 * JD-Core Version:       1.1.3
 */