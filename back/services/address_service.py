from flask import jsonify, request
from flask_jwt_extended import get_jwt_identity # type: ignore

from models import Address, db


def _require_user_id():
    user_id = get_jwt_identity()
    if not user_id:
        return None
    return int(user_id)


def list_addresses():
    user_id = _require_user_id()
    rows = (
        Address.query.filter_by(user_id=user_id)
        .order_by(Address.is_default.desc(), Address.id.desc())
        .all()
    )
    return jsonify([a.to_dict() for a in rows]), 200


def create_address():
    user_id = _require_user_id()
    data = request.get_json() or {}

    label = (data.get("label") or "").strip()
    street = (data.get("street") or "").strip()
    city = (data.get("city") or "").strip()
    province = (data.get("province") or "").strip()

    if not label or not street or not city or not province:
        return jsonify({"msg": "Completá label, calle, ciudad y provincia."}), 400

    is_default = bool(data.get("isDefault"))
    if is_default:
        Address.query.filter_by(user_id=user_id, is_default=True).update({"is_default": False})

    addr = Address(
        user_id=user_id,
        label=label,
        street=street,
        city=city,
        province=province,
        postal_code=(data.get("postalCode") or "").strip() or None,
        type=(data.get("type") or "house"),
        apartment=(data.get("apartment") or "").strip() or None,
        floor=(data.get("floor") or "").strip() or None,
        bell=(data.get("bell") or "").strip() or None,
        notes=(data.get("notes") or "").strip() or None,
        is_default=is_default,
    )

    db.session.add(addr)
    db.session.commit()
    return jsonify(addr.to_dict()), 201


def update_address(address_id: int):
    user_id = _require_user_id()
    addr = Address.query.filter_by(id=address_id, user_id=user_id).first()
    if not addr:
        return jsonify({"msg": "Dirección no encontrada"}), 404

    data = request.get_json() or {}

    def _s(value):
        return (value or "").strip()

    if "label" in data:
        addr.label = _s(data.get("label"))
    if "street" in data:
        addr.street = _s(data.get("street"))
    if "city" in data:
        addr.city = _s(data.get("city"))
    if "province" in data:
        addr.province = _s(data.get("province"))
    if "postalCode" in data:
        addr.postal_code = _s(data.get("postalCode")) or None

    if "type" in data:
        addr.type = data.get("type") or "house"
    if "apartment" in data:
        addr.apartment = _s(data.get("apartment")) or None
    if "floor" in data:
        addr.floor = _s(data.get("floor")) or None
    if "bell" in data:
        addr.bell = _s(data.get("bell")) or None
    if "notes" in data:
        addr.notes = _s(data.get("notes")) or None

    if "isDefault" in data:
        make_default = bool(data.get("isDefault"))
        if make_default:
            Address.query.filter_by(user_id=user_id, is_default=True).update({"is_default": False})
            addr.is_default = True
        else:
            addr.is_default = False

    db.session.commit()
    return jsonify(addr.to_dict()), 200


def delete_address(address_id: int):
    user_id = _require_user_id()
    addr = Address.query.filter_by(id=address_id, user_id=user_id).first()
    if not addr:
        return jsonify({"msg": "Dirección no encontrada"}), 404

    db.session.delete(addr)
    db.session.commit()
    return jsonify({"ok": True}), 200


def set_default_address(address_id: int):
    user_id = _require_user_id()
    addr = Address.query.filter_by(id=address_id, user_id=user_id).first()
    if not addr:
        return jsonify({"msg": "Dirección no encontrada"}), 404

    Address.query.filter_by(user_id=user_id, is_default=True).update({"is_default": False})
    addr.is_default = True

    db.session.commit()
    return jsonify(addr.to_dict()), 200