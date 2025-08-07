import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput, type LoginInput } from '../schema';
import { registerUser, loginUser } from '../handlers/auth';
import { eq } from 'drizzle-orm';

// Test inputs
const affiliateInput: CreateUserInput = {
  email: 'affiliate@test.com',
  password: 'password123',
  full_name: 'John Affiliate',
  role: 'affiliate'
};

const adminInput: CreateUserInput = {
  email: 'admin@test.com',
  password: 'adminpass123',
  full_name: 'Jane Admin',
  role: 'admin'
};

const loginInput: LoginInput = {
  email: 'affiliate@test.com',
  password: 'password123'
};

describe('registerUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should register an affiliate user with affiliate code', async () => {
    const result = await registerUser(affiliateInput);

    // Basic field validation
    expect(result.email).toEqual('affiliate@test.com');
    expect(result.full_name).toEqual('John Affiliate');
    expect(result.role).toEqual('affiliate');
    expect(result.affiliate_code).toBeDefined();
    expect(result.affiliate_code).not.toBeNull();
    expect(result.affiliate_code).toMatch(/^AFF[A-Z0-9]+$/);
    expect(result.password_hash).toBeDefined();
    expect(result.password_hash).not.toEqual('password123'); // Should be hashed
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should register an admin user without affiliate code', async () => {
    const result = await registerUser(adminInput);

    // Basic field validation
    expect(result.email).toEqual('admin@test.com');
    expect(result.full_name).toEqual('Jane Admin');
    expect(result.role).toEqual('admin');
    expect(result.affiliate_code).toBeNull();
    expect(result.password_hash).toBeDefined();
    expect(result.password_hash).not.toEqual('adminpass123'); // Should be hashed
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save user to database', async () => {
    const result = await registerUser(affiliateInput);

    // Query user from database
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].email).toEqual('affiliate@test.com');
    expect(users[0].full_name).toEqual('John Affiliate');
    expect(users[0].role).toEqual('affiliate');
    expect(users[0].affiliate_code).toBeDefined();
    expect(users[0].password_hash).toBeDefined();
  });

  it('should generate unique affiliate codes for multiple affiliates', async () => {
    const affiliate1 = await registerUser({
      ...affiliateInput,
      email: 'affiliate1@test.com'
    });

    const affiliate2 = await registerUser({
      ...affiliateInput,
      email: 'affiliate2@test.com'
    });

    expect(affiliate1.affiliate_code).toBeDefined();
    expect(affiliate2.affiliate_code).toBeDefined();
    expect(affiliate1.affiliate_code).not.toEqual(affiliate2.affiliate_code);
  });

  it('should throw error for duplicate email', async () => {
    // Register first user
    await registerUser(affiliateInput);

    // Try to register with same email
    await expect(registerUser(affiliateInput))
      .rejects.toThrow(/email already exists/i);
  });

  it('should hash passwords properly', async () => {
    const user1 = await registerUser({
      ...affiliateInput,
      email: 'user1@test.com',
      password: 'samepassword'
    });

    const user2 = await registerUser({
      ...affiliateInput,
      email: 'user2@test.com',
      password: 'samepassword'
    });

    // Same password should result in same hash (using simple SHA-256)
    expect(user1.password_hash).toEqual(user2.password_hash);
    expect(user1.password_hash).not.toEqual('samepassword');
  });
});

describe('loginUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should login with valid credentials', async () => {
    // First register a user
    await registerUser(affiliateInput);

    // Then login with same credentials
    const result = await loginUser(loginInput);

    expect(result.email).toEqual('affiliate@test.com');
    expect(result.full_name).toEqual('John Affiliate');
    expect(result.role).toEqual('affiliate');
    expect(result.affiliate_code).toBeDefined();
    expect(result.password_hash).toBeDefined();
    expect(result.id).toBeDefined();
  });

  it('should throw error for non-existent email', async () => {
    await expect(loginUser({
      email: 'nonexistent@test.com',
      password: 'password123'
    })).rejects.toThrow(/invalid email or password/i);
  });

  it('should throw error for wrong password', async () => {
    // Register user
    await registerUser(affiliateInput);

    // Try to login with wrong password
    await expect(loginUser({
      email: 'affiliate@test.com',
      password: 'wrongpassword'
    })).rejects.toThrow(/invalid email or password/i);
  });

  it('should login admin users', async () => {
    // Register admin
    await registerUser(adminInput);

    // Login as admin
    const result = await loginUser({
      email: 'admin@test.com',
      password: 'adminpass123'
    });

    expect(result.email).toEqual('admin@test.com');
    expect(result.role).toEqual('admin');
    expect(result.affiliate_code).toBeNull();
  });

  it('should return user with all required fields', async () => {
    // Register user
    const registeredUser = await registerUser(affiliateInput);

    // Login user
    const loggedInUser = await loginUser(loginInput);

    // Should return same user data
    expect(loggedInUser.id).toEqual(registeredUser.id);
    expect(loggedInUser.email).toEqual(registeredUser.email);
    expect(loggedInUser.full_name).toEqual(registeredUser.full_name);
    expect(loggedInUser.role).toEqual(registeredUser.role);
    expect(loggedInUser.affiliate_code).toEqual(registeredUser.affiliate_code);
    expect(loggedInUser.password_hash).toEqual(registeredUser.password_hash);
    expect(loggedInUser.created_at).toEqual(registeredUser.created_at);
    expect(loggedInUser.updated_at).toEqual(registeredUser.updated_at);
  });
});