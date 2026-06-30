/*    */ package com.smartcare.backend.controller;
/*    */ import com.smartcare.backend.entity.config.ConfigBed;
/*    */ import com.smartcare.backend.service.ConfigBedService;
/*    */ import java.util.List;
/*    */ import org.springframework.http.ResponseEntity;
/*    */ import org.springframework.web.bind.annotation.CrossOrigin;
/*    */ import org.springframework.web.bind.annotation.GetMapping;
/*    */ import org.springframework.web.bind.annotation.RequestMapping;
/*    */ import org.springframework.web.bind.annotation.RestController;
/*    */ 
/*    */ @RestController
/*    */ @RequestMapping({"/api/v1/icu/config-beds"})
/*    */ @CrossOrigin(origins = {"*"})
/*    */ public class ConfigBedController {
/*    */   public ConfigBedController(ConfigBedService service) {
/* 16 */     this.service = service;
/*    */   }
/*    */   
/*    */   private final ConfigBedService service;
/*    */   
/*    */   @GetMapping
/*    */   public ResponseEntity<List<ConfigBed>> listAll() {
/* 23 */     return ResponseEntity.ok(this.service.findAll());
/*    */   }
/*    */ }


/* Location:              E:\深医\医院\重钢医院\AI\backend-from-0.0.1.jar!\com\smartcare\backend\controller\ConfigBedController.class
 * Java compiler version: 11 (55.0)
 * JD-Core Version:       1.1.3
 */