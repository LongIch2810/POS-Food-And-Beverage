DO $$
DECLARE
  v_store_id uuid := gen_random_uuid();
  v_branch_id uuid := gen_random_uuid();
  v_owner_role_id uuid;
  v_owner_id uuid := gen_random_uuid();
  v_hash text := '$2b$10$cFrxUI4opdnle7CM.0yD8e8TH8I885c9H.8gA6HexhN7O8bJ5ovrW';
BEGIN
  SELECT id INTO v_owner_role_id FROM roles WHERE name = 'OWNER';
  
  -- Xoa sach du lieu test cu
  DELETE FROM products WHERE category_id IN (SELECT id FROM categories WHERE store_id IN (SELECT id FROM stores WHERE name = 'E2E Coffee & Tea'));
  DELETE FROM categories WHERE store_id IN (SELECT id FROM stores WHERE name = 'E2E Coffee & Tea');
  DELETE FROM sizes WHERE store_id IN (SELECT id FROM stores WHERE name = 'E2E Coffee & Tea');
  DELETE FROM toppings WHERE store_id IN (SELECT id FROM stores WHERE name = 'E2E Coffee & Tea');
  DELETE FROM dining_tables WHERE branch_id IN (SELECT id FROM branches WHERE store_id IN (SELECT id FROM stores WHERE name = 'E2E Coffee & Tea'));
  DELETE FROM refresh_tokens WHERE user_id IN (SELECT id FROM users WHERE username = 'e2e_owner');
  DELETE FROM users WHERE username = 'e2e_owner';
  DELETE FROM branches WHERE store_id IN (SELECT id FROM stores WHERE name = 'E2E Coffee & Tea');
  DELETE FROM stores WHERE name = 'E2E Coffee & Tea';

  INSERT INTO stores(id, name, status) VALUES (v_store_id, 'E2E Coffee & Tea', 'ACTIVE');
  INSERT INTO branches(id, store_id, code, name, initial_cash, is_active)
    VALUES (v_branch_id, v_store_id, 'HQ01', 'Hội Quán Chính', 1000000, true);
  INSERT INTO users(id, store_id, branch_id, role_id, username, full_name, password_hash, is_active, must_change_password)
    VALUES (v_owner_id, v_store_id, v_branch_id, v_owner_role_id, 'e2e_owner', 'E2E Store Owner', v_hash, true, true);
END
$$;
