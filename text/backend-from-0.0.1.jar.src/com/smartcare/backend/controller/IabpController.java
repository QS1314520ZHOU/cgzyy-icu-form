/*    */ package com.smartcare.backend.controller;
/*    */ import com.smartcare.backend.entity.IabpRecord;
/*    */ import com.smartcare.backend.service.IabpService;
/*    */ import org.springframework.http.ResponseEntity;
/*    */ import org.springframework.web.bind.annotation.GetMapping;
/*    */ import org.springframework.web.bind.annotation.PathVariable;
/*    */ 
/*    */ @RestController
/*    */ @RequestMapping({"/api/v1/icu/iabp"})
/*    */ @CrossOrigin(origins = {"*"})
/*    */ public class IabpController {
/*    */   public IabpController(IabpService service) {
/* 13 */     this.service = service;
/*    */   }
/*    */   
/*    */   private final IabpService service;
/*    */   
/*    */   @PostMapping
/*    */   public ResponseEntity<IabpRecord> save(@RequestBody IabpRecord record) {
/* 20 */     return ResponseEntity.ok(this.service.save(record));
/*    */   }
/*    */   
/*    */   @GetMapping({"/patient/{pid}"})
/*    */   public ResponseEntity<List<IabpRecord>> getByPid(@PathVariable String pid) {
/* 25 */     return ResponseEntity.ok(this.service.findByPid(pid));
/*    */   }
/*    */   
/*    */   @GetMapping({"/{id}"})
/*    */   public ResponseEntity<IabpRecord> getById(@PathVariable String id) {
/* 30 */     IabpRecord record = this.service.findById(id);
/* 31 */     return (record != null) ? ResponseEntity.ok(record) : ResponseEntity.notFound().build();
/*    */   }
/*    */   
/*    */   @DeleteMapping({"/{id}"})
/*    */   public ResponseEntity<Void> delete(@PathVariable String id) {
/* 36 */     this.service.deleteById(id);
/* 37 */     return ResponseEntity.noContent().build();
/*    */   }
/*    */ }


/* Location:              E:\深医\医院\重钢医院\AI\backend-from-0.0.1.jar!\com\smartcare\backend\controller\IabpController.class
 * Java compiler version: 11 (55.0)
 * JD-Core Version:       1.1.3
 */