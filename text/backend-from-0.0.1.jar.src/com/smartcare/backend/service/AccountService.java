/*    */ package com.smartcare.backend.service;
/*    */ 
/*    */ import com.smartcare.backend.entity.account.Account;
/*    */ import com.smartcare.backend.repository.AccountRepository;
/*    */ import java.util.List;
/*    */ import org.springframework.stereotype.Service;
/*    */ 
/*    */ @Service
/*    */ public class AccountService {
/*    */   public AccountService(AccountRepository repository) {
/* 11 */     this.repository = repository;
/*    */   }
/*    */ 
/*    */   
/*    */   public List<Account> findAll() {
/* 16 */     return this.repository.findAll();
/*    */   }
/*    */   private final AccountRepository repository;
/*    */   public List<Account> findByProfession(String profession) {
/* 20 */     return this.repository.findByProfession(profession);
/*    */   }
/*    */ }


/* Location:              E:\深医\医院\重钢医院\AI\backend-from-0.0.1.jar!\com\smartcare\backend\service\AccountService.class
 * Java compiler version: 11 (55.0)
 * JD-Core Version:       1.1.3
 */