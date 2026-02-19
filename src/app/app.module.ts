import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { SignUpComponent } from './pages/sign-up/sign-up.component';
import { SignInComponent } from './pages/sign-in/sign-in.component';
import { VerificationComponent } from './pages/verification/verification.component';
import { ResetPasswordComponent } from './pages/reset-password/reset-password.component';
import { NewPasswordComponent } from './pages/new-password/new-password.component';
import { ChatComponent } from './pages/chat/chat.component';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { JwtInterceptor } from './core/interceptors/jwt.interceptor';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { WelcomComponent } from './pages/welcom/welcom.component';
import { ConversationComponent } from './pages/conversation/conversation.component';
import { TruncatePipe } from './pipes/truncate/truncate.pipe';
import { SpinnerComponent } from './components/spinner/spinner.component';

@NgModule({
  declarations: [
    AppComponent,
    SignUpComponent,
    SignInComponent,
    VerificationComponent,
    ResetPasswordComponent,
    NewPasswordComponent,
    ChatComponent,
    WelcomComponent,
    ConversationComponent,
    TruncatePipe,
    SpinnerComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule
  ],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: JwtInterceptor,
      multi: true // ⚠️ OBLIGATOIRE
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
