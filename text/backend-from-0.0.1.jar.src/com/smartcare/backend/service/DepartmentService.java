/*    */ package com.smartcare.backend.service;
/*    */ 
/*    */ import com.smartcare.backend.entity.department.Department;
/*    */ import com.smartcare.backend.repository.DepartmentRepository;
/*    */ import java.util.List;
/*    */ import org.springframework.stereotype.Service;
/*    */ 
/*    */ @Service
/*    */ public class DepartmentService {
/*    */   public DepartmentService(DepartmentRepository repository) {
/* 11 */     this.repository = repository;
/*    */   }
/*    */ 
/*    */   
/*    */   public List<Department> findAll() {
/* 16 */     return this.repository.findAll();
/*    */   }
/*    */   
/*    */   private final DepartmentRepository repository;
/*    */ }


/* Location:              E:\深医\医院\重钢医院\AI\backend-from-0.0.1.jar!\com\smartcare\backend\service\DepartmentService.class
 * Java compiler version: 11 (55.0)
 * JD-Core Version:       1.1.3
 */