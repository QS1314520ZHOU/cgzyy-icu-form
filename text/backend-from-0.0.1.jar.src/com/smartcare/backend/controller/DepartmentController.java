/*    */ package com.smartcare.backend.controller;
/*    */ import com.smartcare.backend.entity.department.Department;
/*    */ import com.smartcare.backend.service.DepartmentService;
/*    */ import java.util.List;
/*    */ import org.springframework.http.ResponseEntity;
/*    */ import org.springframework.web.bind.annotation.CrossOrigin;
/*    */ import org.springframework.web.bind.annotation.GetMapping;
/*    */ import org.springframework.web.bind.annotation.RequestMapping;
/*    */ import org.springframework.web.bind.annotation.RestController;
/*    */ 
/*    */ @RestController
/*    */ @RequestMapping({"/api/v1/icu/departments"})
/*    */ @CrossOrigin(origins = {"*"})
/*    */ public class DepartmentController {
/*    */   public DepartmentController(DepartmentService service) {
/* 16 */     this.service = service;
/*    */   }
/*    */   
/*    */   private final DepartmentService service;
/*    */   
/*    */   @GetMapping
/*    */   public ResponseEntity<List<Department>> listAll() {
/* 23 */     return ResponseEntity.ok(this.service.findAll());
/*    */   }
/*    */ }


/* Location:              E:\深医\医院\重钢医院\AI\backend-from-0.0.1.jar!\com\smartcare\backend\controller\DepartmentController.class
 * Java compiler version: 11 (55.0)
 * JD-Core Version:       1.1.3
 */