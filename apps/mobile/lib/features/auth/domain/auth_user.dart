import 'dart:convert';

/// Strongly typed AuthUser domain model.
/// Anti-slop rule: Zero untyped dynamic maps.
class AuthUser {
  final String id;
  final String email;
  final String name;
  final String role;
  final DateTime? createdAt;

  const AuthUser({
    required this.id,
    required this.email,
    required this.name,
    required this.role,
    this.createdAt,
  });

  factory AuthUser.fromJson(Map<String, dynamic> json) {
    return AuthUser(
      id: json['id'] as String,
      email: json['email'] as String,
      name: json['name'] as String,
      role: (json['role'] as String?)?.toUpperCase() ?? 'RESPONDER',
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'] as String)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'name': name,
      'role': role,
      'createdAt': createdAt?.toIso8601String(),
    };
  }

  String toJsonString() => jsonEncode(toJson());

  factory AuthUser.fromJsonString(String jsonStr) =>
      AuthUser.fromJson(jsonDecode(jsonStr) as Map<String, dynamic>);

  AuthUser copyWith({
    String? id,
    String? email,
    String? name,
    String? role,
    DateTime? createdAt,
  }) {
    return AuthUser(
      id: id ?? this.id,
      email: email ?? this.email,
      name: name ?? this.name,
      role: role ?? this.role,
      createdAt: createdAt ?? this.createdAt,
    );
  }
}
