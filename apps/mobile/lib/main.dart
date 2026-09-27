import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'core/theme/app_theme.dart';
import 'core/widgets/skeleton_widget.dart';
import 'features/auth/presentation/controllers/auth_controller.dart';
import 'features/auth/presentation/screens/login_screen.dart';
import 'features/navigation/screens/main_navigation_shell.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize persistent preferences
  final prefs = await SharedPreferences.getInstance();

  runApp(
    ProviderScope(
      overrides: [sharedPreferencesProvider.overrideWithValue(prefs)],
      child: const IncidentPulseApp(),
    ),
  );
}

class IncidentPulseApp extends ConsumerWidget {
  const IncidentPulseApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authControllerProvider);

    return MaterialApp(
      title: 'IncidentPulse',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: ThemeMode.dark, // Default to High-Contrast Obsidian Dark Mode
      home: Builder(
        builder: (context) {
          // If checking initial auth status
          if (authState.isLoading && !authState.isAuthenticated) {
            return const Scaffold(
              body: Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    SkeletonWidget.circular(size: 64),
                    SizedBox(height: 24),
                    SkeletonWidget(width: 180, height: 16),
                    SizedBox(height: 8),
                    SkeletonWidget(width: 120, height: 12),
                  ],
                ),
              ),
            );
          }

          // Authenticated view
          if (authState.isAuthenticated) {
            return const MainNavigationShell();
          }

          // Unauthenticated login view
          return const LoginScreen();
        },
      ),
    );
  }
}
