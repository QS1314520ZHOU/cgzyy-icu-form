/*    */ package com.smartcare.backend.entity.account;
/*    */ 
/*    */ 
/*    */ @Document
/*    */ public class Account {
/*    */   private String id;
/*    */   private String username;
/*    */   private String trueName;
/*    */   
/* 10 */   public void setId(String id) { this.id = id; } private String valid; private String departmentCode; private String profession; public void setUsername(String username) { this.username = username; } public void setTrueName(String trueName) { this.trueName = trueName; } public void setValid(String valid) { this.valid = valid; } public void setDepartmentCode(String departmentCode) { this.departmentCode = departmentCode; } public void setProfession(String profession) { this.profession = profession; } public boolean equals(Object o) { if (o == this) return true;  if (!(o instanceof Account)) return false;  Account other = (Account)o; if (!other.canEqual(this)) return false;  Object this$id = getId(), other$id = other.getId(); if ((this$id == null) ? (other$id != null) : !this$id.equals(other$id)) return false;  Object this$username = getUsername(), other$username = other.getUsername(); if ((this$username == null) ? (other$username != null) : !this$username.equals(other$username)) return false;  Object this$trueName = getTrueName(), other$trueName = other.getTrueName(); if ((this$trueName == null) ? (other$trueName != null) : !this$trueName.equals(other$trueName)) return false;  Object this$valid = getValid(), other$valid = other.getValid(); if ((this$valid == null) ? (other$valid != null) : !this$valid.equals(other$valid)) return false;  Object this$departmentCode = getDepartmentCode(), other$departmentCode = other.getDepartmentCode(); if ((this$departmentCode == null) ? (other$departmentCode != null) : !this$departmentCode.equals(other$departmentCode)) return false;  Object this$profession = getProfession(), other$profession = other.getProfession(); return !((this$profession == null) ? (other$profession != null) : !this$profession.equals(other$profession)); } protected boolean canEqual(Object other) { return other instanceof Account; } public int hashCode() { int PRIME = 59; result = 1; Object $id = getId(); result = result * 59 + (($id == null) ? 43 : $id.hashCode()); Object $username = getUsername(); result = result * 59 + (($username == null) ? 43 : $username.hashCode()); Object $trueName = getTrueName(); result = result * 59 + (($trueName == null) ? 43 : $trueName.hashCode()); Object $valid = getValid(); result = result * 59 + (($valid == null) ? 43 : $valid.hashCode()); Object $departmentCode = getDepartmentCode(); result = result * 59 + (($departmentCode == null) ? 43 : $departmentCode.hashCode()); Object $profession = getProfession(); return result * 59 + (($profession == null) ? 43 : $profession.hashCode()); } public String toString() { return "Account(id=" + getId() + ", username=" + getUsername() + ", trueName=" + getTrueName() + ", valid=" + getValid() + ", departmentCode=" + getDepartmentCode() + ", profession=" + getProfession() + ")"; }
/*    */ 
/*    */   
/* 13 */   public String getId() { return this.id; }
/* 14 */   public String getUsername() { return this.username; }
/* 15 */   public String getTrueName() { return this.trueName; }
/* 16 */   public String getValid() { return this.valid; }
/* 17 */   public String getDepartmentCode() { return this.departmentCode; } public String getProfession() {
/* 18 */     return this.profession;
/*    */   }
/*    */ }


/* Location:              E:\深医\医院\重钢医院\AI\backend-from-0.0.1.jar!\com\smartcare\backend\entity\account\Account.class
 * Java compiler version: 11 (55.0)
 * JD-Core Version:       1.1.3
 */