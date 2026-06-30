/*    */ package com.smartcare.backend.controller;
/*    */ import com.smartcare.backend.entity.RmRecord;
/*    */ import com.smartcare.backend.service.RmService;
/*    */ import org.springframework.http.ResponseEntity;
/*    */ import org.springframework.web.bind.annotation.GetMapping;
/*    */ import org.springframework.web.bind.annotation.PathVariable;
/*    */ 
/*    */ @RestController
/*    */ @RequestMapping({"/api/v1/icu/rm"})
/*    */ @CrossOrigin(origins = {"*"})
/*    */ public class RmController {
/*    */   public RmController(RmService service) {
/* 13 */     this.service = service;
/*    */   }
/*    */   
/*    */   private final RmService service;
/*    */   
/*    */   @PostMapping
/*    */   public ResponseEntity<RmRecord> save(@RequestBody RmRecord record) {
/* 20 */     return ResponseEntity.ok(this.service.save(record));
/*    */   }
/*    */   
/*    */   @GetMapping({"/patient/{pid}"})
/*    */   public ResponseEntity<List<RmRecord>> getByPid(@PathVariable String pid) {
/* 25 */     return ResponseEntity.ok(this.service.findByPid(pid));
/*    */   }
/*    */   
/*    */   @GetMapping({"/{id}"})
/*    */   public ResponseEntity<RmRecord> getById(@PathVariable String id) {
/* 30 */     RmRecord record = this.service.findById(id);
/* 31 */     return (record != null) ? ResponseEntity.ok(record) : ResponseEntity.notFound().build();
/*    */   }
/*    */   
/*    */   @DeleteMapping({"/{id}"})
/*    */   public ResponseEntity<Void> delete(@PathVariable String id) {
/* 36 */     this.service.deleteById(id);
/* 37 */     return ResponseEntity.noContent().build();
/*    */   }
/*    */ }


/* Location:              E:\深医\医院\重钢医院\AI\backend-from-0.0.1.jar!\com\smartcare\backend\controller\RmController.class
 * Java compiler version: 11 (55.0)
 * JD-Core Version:       1.1.3
 */