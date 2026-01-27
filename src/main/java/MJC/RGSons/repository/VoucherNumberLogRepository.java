package MJC.RGSons.repository;

import MJC.RGSons.model.VoucherNumberLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface VoucherNumberLogRepository extends JpaRepository<VoucherNumberLog, Long> {
}
