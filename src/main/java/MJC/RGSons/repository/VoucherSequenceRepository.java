package MJC.RGSons.repository;

import MJC.RGSons.model.VoucherSequence;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface VoucherSequenceRepository extends JpaRepository<VoucherSequence, Integer> {
    Optional<VoucherSequence> findByVoucherTypeAndStoreIdAndResetKey(String voucherType, Integer storeId, String resetKey);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select vs
            from VoucherSequence vs
            where vs.voucherType = :voucherType
              and vs.resetKey = :resetKey
              and (
                (:storeId is null and vs.storeId is null)
                or (:storeId is not null and vs.storeId = :storeId)
              )
            """)
    Optional<VoucherSequence> findForUpdate(
            @Param("voucherType") String voucherType,
            @Param("storeId") Integer storeId,
            @Param("resetKey") String resetKey
    );
}
