/*    */ package com.smartcare.backend.controller;
/*    */ import com.smartcare.backend.entity.account.Account;
/*    */ import com.smartcare.backend.service.AccountService;
/*    */ import java.util.List;
/*    */ import java.util.stream.Collectors;
/*    */ import org.springframework.http.ResponseEntity;
/*    */ import org.springframework.web.bind.annotation.GetMapping;
/*    */ import org.springframework.web.bind.annotation.RequestMapping;
/*    */ import org.springframework.web.bind.annotation.RequestParam;
/*    */ import org.springframework.web.bind.annotation.RestController;
/*    */ 
/*    */ @RestController
/*    */ @RequestMapping({"/api/v1/icu/accounts"})
/*    */ @CrossOrigin(origins = {"*"})
/*    */ public class AccountController {
/*    */   private final AccountService service;
/*    */   
/*    */   public AccountController(AccountService service) {
/* 19 */     this.service = service;
/*    */   }
/*    */ 
/*    */ 
/*    */   
/*    */   @GetMapping
/*    */   public ResponseEntity<List<AccountDto>> listAll(@RequestParam(required = false) String profession) {
/*    */     List<Account> accounts;
/* 27 */     if (profession != null && !profession.trim().isEmpty()) {
/* 28 */       accounts = this.service.findByProfession(profession.trim());
/*    */     } else {
/* 30 */       accounts = this.service.findAll();
/*    */     } 
/*    */ 
/*    */ 
/*    */     
/* 35 */     List<AccountDto> list = (List<AccountDto>)accounts.stream().map(a -> new AccountDto(a.getUsername(), a.getTrueName())).collect(Collectors.toList());
/* 36 */     return ResponseEntity.ok(list);
/*    */   } public static class AccountDto {
/*    */     private String accountId;
/* 39 */     public void setAccountId(String accountId) { this.accountId = accountId; } private String accountName; public void setAccountName(String accountName) { this.accountName = accountName; } public boolean equals(Object o) { if (o == this) return true;  if (!(o instanceof AccountDto)) return false;  AccountDto other = (AccountDto)o; if (!other.canEqual(this)) return false;  Object this$accountId = getAccountId(), other$accountId = other.getAccountId(); if ((this$accountId == null) ? (other$accountId != null) : !this$accountId.equals(other$accountId)) return false;  Object this$accountName = getAccountName(), other$accountName = other.getAccountName(); return !((this$accountName == null) ? (other$accountName != null) : !this$accountName.equals(other$accountName)); } protected boolean canEqual(Object other) { return other instanceof AccountDto; } public int hashCode() { int PRIME = 59; result = 1; Object $accountId = getAccountId(); result = result * 59 + (($accountId == null) ? 43 : $accountId.hashCode()); Object $accountName = getAccountName(); return result * 59 + (($accountName == null) ? 43 : $accountName.hashCode()); } public String toString() { return "AccountController.AccountDto(accountId=" + getAccountId() + ", accountName=" + getAccountName() + ")"; }
/*    */     
/* 41 */     public String getAccountId() { return this.accountId; } public String getAccountName() {
/* 42 */       return this.accountName;
/*    */     }
/*    */     public AccountDto(String accountId, String accountName) {
/* 45 */       this.accountId = accountId;
/* 46 */       this.accountName = accountName;
/*    */     }
/*    */   }
/*    */ }


/* Location:              E:\深医\医院\重钢医院\AI\backend-from-0.0.1.jar!\com\smartcare\backend\controller\AccountController.class
 * Java compiler version: 11 (55.0)
 * JD-Core Version:       1.1.3
 */