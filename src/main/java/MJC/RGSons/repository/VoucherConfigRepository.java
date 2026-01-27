package MJC.RGSons.repository;

import MJC.RGSons.model.VoucherConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface VoucherConfigRepository extends JpaRepository<VoucherConfig, Integer> {
    Optional<VoucherConfig> findByVoucherType(String voucherType);
}
