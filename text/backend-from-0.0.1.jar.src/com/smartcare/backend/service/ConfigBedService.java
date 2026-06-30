/*    */ package com.smartcare.backend.service;
/*    */ 
/*    */ import com.smartcare.backend.entity.config.ConfigBed;
/*    */ import com.smartcare.backend.repository.ConfigBedRepository;
/*    */ import java.util.List;
/*    */ import org.springframework.stereotype.Service;
/*    */ 
/*    */ @Service
/*    */ public class ConfigBedService {
/*    */   public ConfigBedService(ConfigBedRepository repository) {
/* 11 */     this.repository = repository;
/*    */   }
/*    */ 
/*    */   
/*    */   public List<ConfigBed> findAll() {
/* 16 */     return this.repository.findAll();
/*    */   }
/*    */   
/*    */   private final ConfigBedRepository repository;
/*    */ }


/* Location:              E:\深医\医院\重钢医院\AI\backend-from-0.0.1.jar!\com\smartcare\backend\service\ConfigBedService.class
 * Java compiler version: 11 (55.0)
 * JD-Core Version:       1.1.3
 */