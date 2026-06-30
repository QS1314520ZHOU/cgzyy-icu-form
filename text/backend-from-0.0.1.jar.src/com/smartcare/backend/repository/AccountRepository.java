package com.smartcare.backend.repository;

import com.smartcare.backend.entity.account.Account;
import java.util.List;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AccountRepository extends MongoRepository<Account, String> {
  List<Account> findByProfession(String paramString);
}


/* Location:              E:\深医\医院\重钢医院\AI\backend-from-0.0.1.jar!\com\smartcare\backend\repository\AccountRepository.class
 * Java compiler version: 11 (55.0)
 * JD-Core Version:       1.1.3
 */