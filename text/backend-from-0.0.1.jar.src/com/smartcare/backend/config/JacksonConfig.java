/*    */ package com.smartcare.backend.config;
/*    */ 
/*    */ import java.util.TimeZone;
/*    */ import org.springframework.boot.autoconfigure.jackson.Jackson2ObjectMapperBuilderCustomizer;
/*    */ import org.springframework.context.annotation.Bean;
/*    */ import org.springframework.context.annotation.Configuration;
/*    */ import org.springframework.http.converter.json.Jackson2ObjectMapperBuilder;
/*    */ 
/*    */ 
/*    */ 
/*    */ 
/*    */ 
/*    */ @Configuration
/*    */ public class JacksonConfig
/*    */ {
/*    */   @Bean
/*    */   public Jackson2ObjectMapperBuilderCustomizer jacksonDateCustomizer() {
/* 18 */     return builder -> {
/*    */         builder.simpleDateFormat("yyyy-MM-dd HH:mm:ss");
/*    */         builder.timeZone(TimeZone.getTimeZone("GMT+8"));
/*    */       };
/*    */   }
/*    */ }


/* Location:              E:\深医\医院\重钢医院\AI\backend-from-0.0.1.jar!\com\smartcare\backend\config\JacksonConfig.class
 * Java compiler version: 11 (55.0)
 * JD-Core Version:       1.1.3
 */