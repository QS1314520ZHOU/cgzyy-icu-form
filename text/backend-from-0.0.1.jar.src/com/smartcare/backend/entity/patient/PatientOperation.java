/*    */ package com.smartcare.backend.entity.patient;
/*    */ 
/*    */ public class PatientOperation {
/*    */   private String orderId;
/*    */   private Date startTime;
/*    */   
/*  7 */   public void setOrderId(String orderId) { this.orderId = orderId; } private Date endTime; private String name; private String code; public void setStartTime(Date startTime) { this.startTime = startTime; } public void setEndTime(Date endTime) { this.endTime = endTime; } public void setName(String name) { this.name = name; } public void setCode(String code) { this.code = code; } public boolean equals(Object o) { if (o == this) return true;  if (!(o instanceof PatientOperation)) return false;  PatientOperation other = (PatientOperation)o; if (!other.canEqual(this)) return false;  Object this$orderId = getOrderId(), other$orderId = other.getOrderId(); if ((this$orderId == null) ? (other$orderId != null) : !this$orderId.equals(other$orderId)) return false;  Object this$startTime = getStartTime(), other$startTime = other.getStartTime(); if ((this$startTime == null) ? (other$startTime != null) : !this$startTime.equals(other$startTime)) return false;  Object this$endTime = getEndTime(), other$endTime = other.getEndTime(); if ((this$endTime == null) ? (other$endTime != null) : !this$endTime.equals(other$endTime)) return false;  Object this$name = getName(), other$name = other.getName(); if ((this$name == null) ? (other$name != null) : !this$name.equals(other$name)) return false;  Object this$code = getCode(), other$code = other.getCode(); return !((this$code == null) ? (other$code != null) : !this$code.equals(other$code)); } protected boolean canEqual(Object other) { return other instanceof PatientOperation; } public int hashCode() { int PRIME = 59; result = 1; Object $orderId = getOrderId(); result = result * 59 + (($orderId == null) ? 43 : $orderId.hashCode()); Object $startTime = getStartTime(); result = result * 59 + (($startTime == null) ? 43 : $startTime.hashCode()); Object $endTime = getEndTime(); result = result * 59 + (($endTime == null) ? 43 : $endTime.hashCode()); Object $name = getName(); result = result * 59 + (($name == null) ? 43 : $name.hashCode()); Object $code = getCode(); return result * 59 + (($code == null) ? 43 : $code.hashCode()); } public String toString() { return "PatientOperation(orderId=" + getOrderId() + ", startTime=" + getStartTime() + ", endTime=" + getEndTime() + ", name=" + getName() + ", code=" + getCode() + ")"; }
/*    */    public String getOrderId() {
/*  9 */     return this.orderId;
/*    */   } public Date getStartTime() {
/* 11 */     return this.startTime;
/*    */   } public Date getEndTime() {
/* 13 */     return this.endTime;
/*    */   } public String getName() {
/* 15 */     return this.name;
/*    */   } public String getCode() {
/* 17 */     return this.code;
/*    */   }
/*    */ }


/* Location:              E:\深医\医院\重钢医院\AI\backend-from-0.0.1.jar!\com\smartcare\backend\entity\patient\PatientOperation.class
 * Java compiler version: 11 (55.0)
 * JD-Core Version:       1.1.3
 */