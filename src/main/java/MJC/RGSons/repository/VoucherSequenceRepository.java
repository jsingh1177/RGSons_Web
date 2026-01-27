package MJC.RGSons.repository;

import MJC.RGSons.model.VoucherSequence;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface VoucherSequenceRepository extends JpaRepository<VoucherSequence, Integer> {
    Optional<VoucherSequence> findByVoucherTypeAndStoreIdAndResetKey(String voucherType, Integer storeId, String resetKey);
}
