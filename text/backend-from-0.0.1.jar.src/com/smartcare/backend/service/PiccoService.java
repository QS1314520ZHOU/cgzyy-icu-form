/*    */ package com.smartcare.backend.service;
/*    */ 
/*    */ import com.smartcare.backend.entity.PiccoRecord;
/*    */ import com.smartcare.backend.repository.PiccoRecordRepository;
/*    */ import java.util.List;
/*    */ import org.springframework.stereotype.Service;
/*    */ 
/*    */ @Service
/*    */ public class PiccoService {
/*    */   public PiccoService(PiccoRecordRepository repository) {
/* 11 */     this.repository = repository;
/*    */   }
/*    */ 
/*    */   
/*    */   public PiccoRecord save(PiccoRecord record) {
/* 16 */     return (PiccoRecord)this.repository.save(record);
/*    */   }
/*    */   private final PiccoRecordRepository repository;
/*    */   public List<PiccoRecord> findByPid(String pid) {
/* 20 */     return this.repository.findByPid(pid);
/*    */   }
/*    */   
/*    */   public PiccoRecord findById(String id) {
/* 24 */     return this.repository.findById(id).orElse(null);
/*    */   }
/*    */   
/*    */   public void deleteById(String id) {
/* 28 */     this.repository.deleteById(id);
/*    */   }
/*    */ }


/* Location:              E:\深医\医院\重钢医院\AI\backend-from-0.0.1.jar!\com\smartcare\backend\service\PiccoService.class
 * Java compiler version: 11 (55.0)
 * JD-Core Version:       1.1.3
 */