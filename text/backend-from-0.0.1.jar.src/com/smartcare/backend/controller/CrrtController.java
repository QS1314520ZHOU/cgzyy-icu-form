/*    */ package com.smartcare.backend.controller;
/*    */ import com.smartcare.backend.entity.CrrtRecord;
/*    */ import com.smartcare.backend.service.CrrtService;
/*    */ import org.springframework.http.ResponseEntity;
/*    */ import org.springframework.web.bind.annotation.GetMapping;
/*    */ import org.springframework.web.bind.annotation.PathVariable;
/*    */ 
/*    */ @RestController
/*    */ @RequestMapping({"/api/v1/icu/crrt"})
/*    */ @CrossOrigin(origins = {"*"})
/*    */ public class CrrtController {
/*    */   public CrrtController(CrrtService service) {
/* 13 */     this.service = service;
/*    */   }
/*    */   
/*    */   private final CrrtService service;
/*    */   
/*    */   @PostMapping
/*    */   public ResponseEntity<CrrtRecord> save(@RequestBody CrrtRecord record) {
/* 20 */     return ResponseEntity.ok(this.service.save(record));
/*    */   }
/*    */   
/*    */   @GetMapping({"/patient/{pid}"})
/*    */   public ResponseEntity<List<CrrtRecord>> getByPid(@PathVariable String pid) {
/* 25 */     return ResponseEntity.ok(this.service.findByPid(pid));
/*    */   }
/*    */   
/*    */   @GetMapping({"/{id}"})
/*    */   public ResponseEntity<CrrtRecord> getById(@PathVariable String id) {
/* 30 */     CrrtRecord record = this.service.findById(id);
/* 31 */     return (record != null) ? ResponseEntity.ok(record) : ResponseEntity.notFound().build();
/*    */   }
/*    */   
/*    */   @DeleteMapping({"/{id}"})
/*    */   public ResponseEntity<Void> delete(@PathVariable String id) {
/* 36 */     this.service.deleteById(id);
/* 37 */     return ResponseEntity.noContent().build();
/*    */   }
/*    */ }


/* Location:              E:\深医\医院\重钢医院\AI\backend-from-0.0.1.jar!\com\smartcare\backend\controller\CrrtController.class
 * Java compiler version: 11 (55.0)
 * JD-Core Version:       1.1.3
 */