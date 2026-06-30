package com.smartcare.backend.repository;

import com.smartcare.backend.entity.CrrtRecord;
import java.util.List;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CrrtRecordRepository extends MongoRepository<CrrtRecord, String> {
  List<CrrtRecord> findByPid(String paramString);
}


/* Location:              E:\深医\医院\重钢医院\AI\backend-from-0.0.1.jar!\com\smartcare\backend\repository\CrrtRecordRepository.class
 * Java compiler version: 11 (55.0)
 * JD-Core Version:       1.1.3
 */