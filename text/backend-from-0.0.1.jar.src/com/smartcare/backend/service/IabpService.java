/*    */ package com.smartcare.backend.service;
/*    */ 
/*    */ import com.smartcare.backend.entity.IabpRecord;
/*    */ import com.smartcare.backend.repository.IabpRecordRepository;
/*    */ import java.util.List;
/*    */ import org.springframework.stereotype.Service;
/*    */ 
/*    */ @Service
/*    */ public class IabpService {
/*    */   public IabpService(IabpRecordRepository repository) {
/* 11 */     this.repository = repository;
/*    */   }
/*    */ 
/*    */   
/*    */   public IabpRecord save(IabpRecord record) {
/* 16 */     return (IabpRecord)this.repository.save(record);
/*    */   }
/*    */   private final IabpRecordRepository repository;
/*    */   public List<IabpRecord> findByPid(String pid) {
/* 20 */     return this.repository.findByPid(pid);
/*    */   }
/*    */   
/*    */   public IabpRecord findById(String id) {
/* 24 */     return this.repository.findById(id).orElse(null);
/*    */   }
/*    */   
/*    */   public void deleteById(String id) {
/* 28 */     this.repository.deleteById(id);
/*    */   }
/*    */ }


/* Location:              E:\深医\医院\重钢医院\AI\backend-from-0.0.1.jar!\com\smartcare\backend\service\IabpService.class
 * Java compiler version: 11 (55.0)
 * JD-Core Version:       1.1.3
 */