package MJC.RGSons.service;

import MJC.RGSons.model.ItemUomMap;
import MJC.RGSons.repository.ItemUomMapRepository;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ItemUomMapService {
    @Autowired
    private ItemUomMapRepository itemUomMapRepository;

    public List<ItemUomMap> getByItemAndSize(String itemCode, String sizeCode) {
        final String ic = String.valueOf(itemCode == null ? "" : itemCode).trim();
        final String sc = String.valueOf(sizeCode == null ? "" : sizeCode).trim();
        if (ic.isEmpty()) return List.of();
        if (sc.isEmpty()) return itemUomMapRepository.findByItemCodeOrderByIdAsc(ic);
        return itemUomMapRepository.findByItemCodeAndSizeCodeOrderByIdAsc(ic, sc);
    }

    @Transactional
    public ItemUomMap save(ItemUomMap input) {
        if (input == null) throw new IllegalArgumentException("Invalid payload");

        final String itemCode = String.valueOf(input.getItemCode() == null ? "" : input.getItemCode()).trim();
        final String sizeCode = String.valueOf(input.getSizeCode() == null ? "" : input.getSizeCode()).trim();
        final String baseUom = String.valueOf(input.getBaseUom() == null ? "" : input.getBaseUom()).trim();
        final String altUom = String.valueOf(input.getAltUom() == null ? "" : input.getAltUom()).trim();

        if (itemCode.isEmpty()) throw new IllegalArgumentException("Item code is required");
        if (sizeCode.isEmpty()) throw new IllegalArgumentException("Size code is required");
        if (baseUom.isEmpty()) throw new IllegalArgumentException("Base unit is required");
        if (altUom.isEmpty()) throw new IllegalArgumentException("Alternate unit is required");
        if (baseUom.equalsIgnoreCase(altUom)) throw new IllegalArgumentException("Alternate unit cannot be same as base unit");

        final BigDecimal factor = input.getFactor();
        if (factor == null || factor.compareTo(BigDecimal.ZERO) <= 0) throw new IllegalArgumentException("Factor must be greater than 0");

        ItemUomMap entity;
        if (input.getId() != null) {
            Optional<ItemUomMap> existing = itemUomMapRepository.findById(input.getId());
            entity = existing.orElseGet(ItemUomMap::new);
            entity.setId(existing.map(ItemUomMap::getId).orElse(null));
        } else {
            entity = new ItemUomMap();
        }

        entity.setItemCode(itemCode);
        entity.setSizeCode(sizeCode);
        entity.setBaseUom(baseUom);
        entity.setAltUom(altUom);
        entity.setFactor(factor);
        entity.setPurchasePrice(input.getPurchasePrice());
        entity.setSalePrice(input.getSalePrice());
        entity.setMrp(input.getMrp());

        return itemUomMapRepository.save(entity);
    }

    @Transactional
    public void delete(Integer id) {
        if (id == null) return;
        itemUomMapRepository.deleteById(id);
    }
}

